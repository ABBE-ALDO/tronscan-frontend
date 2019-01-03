/* eslint-disable no-undef */
import React, {Fragment} from "react";
import {injectIntl} from "react-intl";
import {loadTokens} from "../../actions/tokens";
import {connect} from "react-redux";
import TimeAgo from "react-timeago";
import {Client} from "../../services/api";
import {AddressLink, BlockNumberLink, TransactionHashLink} from "../common/Links";
import {getQueryParams} from "../../utils/url";
import {Truncate} from "../common/text";
import {ContractTypes} from "../../utils/protocol";
import {upperFirst} from "lodash";
import SmartTable from "../common/SmartTable.js"
import {TronLoader} from "../common/loaders";
import {DatePicker} from 'antd';
import moment from 'moment';
import xhr from "axios/index";

const RangePicker = DatePicker.RangePicker;


class Transactions extends React.Component {
  constructor() {
    super();
    this.start = new Date(new Date().toLocaleDateString()).getTime();
    this.end = new Date().getTime();
    this.state = {
      transactions: [],
      total: 0,
    };
  }

  // componentWillReceiveProps() {
  //   setTimeout(() => {
  //     this.loadTransactions();
  //   }, 0)
  // }

  componentDidMount() {
    this.loadTransactions();
  }

  componentDidUpdate() {
    // checkPageChanged(this, this.loadTransactions);
  }

  onChange = (page, pageSize) => {
    this.loadTransactions(page, pageSize);
  };

  loadTransactions = async (page = 1, pageSize = 20) => {

    let {location, match} = this.props;
    let date_to = match.params.date;
    let date_start = parseInt(match.params.date) - 24 * 60 * 60 * 1000;

    this.setState({loading: true});

    let searchParams = {};

    for (let [key, value] of Object.entries(getQueryParams(location))) {
      switch (key) {
        case "address":
        case "block":
          searchParams[key] = value;
          break;
      }
    }
    let result = null;
    let transactions = [];
    let total = 0;
    if (date_start) {
      result = await Client.getTransactions({
        sort: '-timestamp',
        date_start: date_start,
        date_to: date_to
      });

    }
    else {
      let req = {
        "query": {
          "bool": {
            "must": [
              {"range": {"date_created": {"gt": this.start, "lt": this.end}}}
            ]
          }
        },
        "from": (page - 1) * pageSize,
        "size": pageSize,
        "sort": {"date_created": "desc"}
      }
      let {data} = await xhr.post(`https://apilist.tronscan.org/transactions/transactions/_search`, req);
      transactions = [];
      total = data.hits.total;
      for (let record of data.hits.hits) {
        transactions.push({
          id: '',
          block: record['_source']['block'],
          hash: record['_source']['hash'],
          timestamp: record['_source']['date_created'],
          ownerAddress: record['_source']['owner_address'],
          contractType: record['_source']['contract_type'],
        });
      }
      /*
      result = await Client.getTransactions({
          sort: '-timestamp',
          limit: pageSize,
          start: (page - 1) * pageSize,
          total: this.state.total,
          ...searchParams,
        });
        */
    }
    this.setState({
      transactions: transactions,
      loading: false,
      total: total
    });
  };

  customizedColumn = () => {
    let {intl} = this.props;
    let column = [
      {
        title: '#',
        dataIndex: 'hash',
        key: 'hash',
        align: 'left',
        className: 'ant_table',
        width: '12%',
        render: (text, record, index) => {
          return <Truncate>
            <TransactionHashLink hash={text}>{text}</TransactionHashLink>
          </Truncate>
        }
      },
      {
        title: upperFirst(intl.formatMessage({id: 'block'})),
        dataIndex: 'block',
        key: 'block',
        align: 'left',
        className: 'ant_table',
        render: (text, record, index) => {
          return <BlockNumberLink number={text}/>
        }
      },
      {
        title: upperFirst(intl.formatMessage({id: 'created'})),
        dataIndex: 'timestamp',
        key: 'timestamp',
        align: 'left',
        render: (text, record, index) => {
          return <TimeAgo date={text}/>
        }
      },
      {
        title: upperFirst(intl.formatMessage({id: 'address'})),
        dataIndex: 'ownerAddress',
        key: 'ownerAddress',
        align: 'left',
        width: '30%',
        className: 'ant_table',
        render: (text, record, index) => {
          return <AddressLink address={text}/>
        }
      },
      {
        title: upperFirst(intl.formatMessage({id: 'contract'})),
        dataIndex: 'contractType',
        key: 'contractType',
        align: 'right',
        className: 'ant_table',
        render: (text, record, index) => {
          return <span>{text}</span>
        },
      },
      // {
      //   title: upperFirst(intl.formatMessage({id: 'status'})),
      //   dataIndex: 'confirmed',
      //   key: 'confirmed',
      //   align: 'center',
      //   className: 'ant_table',
      //   render: (text, record, index) => {
      //       return record.confirmed?
      //           <span className="badge badge-success text-uppercase">{intl.formatMessage({id:'Confirmed'})}</span> :
      //           <span className="badge badge-danger text-uppercase">{intl.formatMessage({id: 'Unconfirmed'})}</span>
      //   },
      // }
    ];
    return column;
  }

  onChangeDate = (dates, dateStrings) => {
    this.start = new Date(dateStrings[0]).getTime();
    this.end = new Date(dateStrings[1]).getTime();
    this.loadTransactions();
  }
  disabledDate = (time) => {
      if(!time){
          return false
      }else{
          return time < moment().subtract(7, "days") || time > moment().add(7, 'd')
      }
  }

  render() {

    let {transactions, total, loading} = this.state;
    let {match, intl} = this.props;
    let column = this.customizedColumn();
    let tableInfo = intl.formatMessage({id: 'view_total'}) + ' ' + total + ' ' + intl.formatMessage({id: 'transactions_unit'})

    return (
        <main className="container header-overlap pb-3 token_black">
          {loading && <div className="loading-style"><TronLoader/></div>}
          <div className="row">
            <div className="col-md-12 table_pos">
              {total ? <div className="table_pos_info d-none d-md-block" style={{left: 'auto'}}>{tableInfo}</div> : ''}
              {
                total ?<div className="transactions-rangePicker" style={{width: "350px"}}>
                  <RangePicker
                      defaultValue={[moment(this.start),moment(this.end)]}
                      ranges={{
                          'Today': [moment().startOf('day'),moment()],
                          'Yesterday': [moment().startOf('day').subtract(1, 'days'), moment().endOf('day').subtract(1, 'days')],
                          'This Week': [moment().startOf('isoWeek'), moment().endOf('isoWeek')],
                          // 'Last Week': [moment().subtract('isoWeek', 1).startOf('isoWeek'), moment().subtract('isoWeek', 1).endOf('isoWeek')]
                      }}
                      disabledDate={this.disabledDate}
                      showTime
                      format="YYYY/MM/DD HH:mm:ss"
                      onChange={this.onChangeDate}
                  />
                </div>:''
              }

              <SmartTable bordered={true} loading={loading}
                          column={column} data={transactions} total={total}
                          onPageChange={(page, pageSize) => {
                            this.loadTransactions(page, pageSize)
                          }}/>
            </div>
          </div>
        </main>
    )
  }
}

function mapStateToProps(state) {

  return {};
}

const mapDispatchToProps = {
  loadTokens,
};

export default connect(mapStateToProps, mapDispatchToProps)(injectIntl(Transactions));
